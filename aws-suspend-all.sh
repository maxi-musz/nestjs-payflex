#!/usr/bin/env bash
set -euo pipefail
export AWS_PAGER=""
DRY_RUN="${DRY_RUN:-true}"   # set DRY_RUN=false to actually delete
REGIONS="$(aws ec2 describe-regions --query 'Regions[].RegionName' --output text)"

echo "DRY_RUN=${DRY_RUN}"
for REGION in ${REGIONS}; do
  echo "=== Region: ${REGION} ==="

  # ECS: scale services to 0 desired count
  for CLUSTER in $(aws ecs list-clusters --region "$REGION" --query 'clusterArns[]' --output text 2>/dev/null); do
    for SERVICE in $(aws ecs list-services --cluster "$CLUSTER" --region "$REGION" --query 'serviceArns[]' --output text 2>/dev/null); do
      echo "ECS scale to 0: $SERVICE"
      aws ecs update-service --cluster "$CLUSTER" --service "$SERVICE" --desired-count 0 --region "$REGION" >/dev/null || true
    done
    # stop any standalone tasks (Fargate/EC2)
    for TASK in $(aws ecs list-tasks --cluster "$CLUSTER" --region "$REGION" --query 'taskArns[]' --output text 2>/dev/null); do
      echo "ECS stop task: $TASK"
      [[ "$DRY_RUN" == "true" ]] || aws ecs stop-task --cluster "$CLUSTER" --task "$TASK" --region "$REGION" >/dev/null || true
    done
  done

  # ELBv2: list (and delete on DRY_RUN=false)
  for ALB in $(aws elbv2 describe-load-balancers --region "$REGION" --query 'LoadBalancers[].LoadBalancerArn' --output text 2>/dev/null); do
    echo "ALB found: $ALB"
    [[ "$DRY_RUN" == "true" ]] || aws elbv2 delete-load-balancer --load-balancer-arn "$ALB" --region "$REGION" || true
  done

  # Target groups (some may be left after ALB deletion)
  for TG in $(aws elbv2 describe-target-groups --region "$REGION" --query 'TargetGroups[].TargetGroupArn' --output text 2>/dev/null); do
    echo "TargetGroup found: $TG"
    [[ "$DRY_RUN" == "true" ]] || aws elbv2 delete-target-group --target-group-arn "$TG" --region "$REGION" || true
  done

  # NAT Gateways
  for NAT in $(aws ec2 describe-nat-gateways --region "$REGION" --query 'NatGateways[].NatGatewayId' --output text 2>/dev/null); do
    echo "NAT GW found: $NAT"
    [[ "$DRY_RUN" == "true" ]] || aws ec2 delete-nat-gateway --nat-gateway-id "$NAT" --region "$REGION" || true
  done

  # Release unattached Elastic IPs
  for ALLOC in $(aws ec2 describe-addresses --region "$REGION" --query 'Addresses[?AssociationId==`null`].AllocationId' --output text 2>/dev/null); do
    echo "Unattached EIP: $ALLOC"
    [[ "$DRY_RUN" == "true" ]] || aws ec2 release-address --allocation-id "$ALLOC" --region "$REGION" || true
  done

  # VPC Endpoints
  for VPCE in $(aws ec2 describe-vpc-endpoints --region "$REGION" --query 'VpcEndpoints[].VpcEndpointId' --output text 2>/dev/null); do
    echo "VPC Endpoint: $VPCE"
    [[ "$DRY_RUN" == "true" ]] || aws ec2 delete-vpc-endpoints --vpc-endpoint-ids "$VPCE" --region "$REGION" || true
  done

  # ECR: apply lifecycle (keeps 1 day) to all repos to cut storage
  for REPO in $(aws ecr describe-repositories --region "$REGION" --query 'repositories[].repositoryName' --output text 2>/dev/null); do
    echo "ECR lifecycle policy on: $REPO"
    aws ecr put-lifecycle-policy --repository-name "$REPO" --region "$REGION" \
      --lifecycle-policy-text '{"rules":[{"rulePriority":1,"description":"expire images older than 1 day","selection":{"tagStatus":"any","countType":"sinceImagePushed","countUnit":"days","countNumber":1},"action":{"type":"expire"}}]}' >/dev/null || true
  done

  # CloudWatch Logs: set 7-day retention for heavy log groups (you can tighten later)
  for LG in $(aws logs describe-log-groups --region "$REGION" --query 'logGroups[].logGroupName' --output text 2>/dev/null); do
    echo "Set retention 7d: $LG"
    aws logs put-retention-policy --log-group-name "$LG" --retention-in-days 7 --region "$REGION" >/dev/null || true
  done

done

echo "Done. To actually delete/stop billable infra, re-run with: DRY_RUN=false bash aws-suspend-all.sh"
