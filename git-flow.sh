#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Git Flow Helper  —  portable interactive git workflow script
# Copy this file into any project; no dependencies beyond git & bash 3.2+.
# Usage:  ./git-flow.sh [--dry-run] [--help]
# ─────────────────────────────────────────────────────────────────────────────

VERSION="1.0.0"
DRY_RUN=false
ORIGINAL_BRANCH=""

# ── Colors ───────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

# ── Helpers ──────────────────────────────────────────────────────────────────

info()    { printf "${BLUE}ℹ${RESET}  %s\n" "$*"; }
success() { printf "${GREEN}✔${RESET}  %s\n" "$*"; }
warn()    { printf "${YELLOW}⚠${RESET}  %s\n" "$*"; }
err()     { printf "${RED}✖${RESET}  %s\n" "$*" >&2; }
header()  { printf "\n${BOLD}${CYAN}━━━ %s ━━━${RESET}\n\n" "$*"; }
divider() { printf "${DIM}──────────────────────────────────────────────${RESET}\n"; }

confirm() {
  local prompt="$1" default="${2:-n}"
  local hint="[y/N]"
  [[ "$default" == "y" ]] && hint="[Y/n]"
  local ans
  read -r -p "$(printf "${YELLOW}?${RESET}  %s %s: " "$prompt" "$hint")" ans
  ans="${ans:-$default}"
  [[ "$ans" =~ ^[Yy]$ ]]
}

run_cmd() {
  printf "${DIM}   \$ %s${RESET}\n" "$*"
  if $DRY_RUN; then
    printf "${YELLOW}   [dry-run] skipped${RESET}\n"
  else
    "$@"
  fi
}

select_one() {
  local prompt="$1"; shift
  local -a options=("$@")
  local count=${#options[@]}

  if (( count == 0 )); then
    err "No options available for: $prompt"
    return 1
  fi

  printf "${BOLD}%s${RESET}\n" "$prompt"
  local i
  for (( i=0; i<count; i++ )); do
    printf "  ${CYAN}%d)${RESET} %s\n" "$((i+1))" "${options[$i]}"
  done

  local choice
  while true; do
    read -r -p "$(printf "${YELLOW}→${RESET} Pick [1-%d]: " "$count")" choice
    if [[ "$choice" =~ ^[0-9]+$ ]] && (( choice >= 1 && choice <= count )); then
      SELECTED="${options[$((choice-1))]}"
      return 0
    fi
    warn "Invalid choice, try again."
  done
}

select_multi() {
  local prompt="$1"; shift
  local -a options=("$@")
  local count=${#options[@]}

  if (( count == 0 )); then
    err "No options available."
    return 1
  fi

  printf "${BOLD}%s${RESET} ${DIM}(comma-separated, e.g. 1,3,5 or 'all')${RESET}\n" "$prompt"
  local i
  for (( i=0; i<count; i++ )); do
    printf "  ${CYAN}%d)${RESET} %s\n" "$((i+1))" "${options[$i]}"
  done

  local input
  read -r -p "$(printf "${YELLOW}→${RESET} Pick: ")" input

  MULTI_SELECTED=()
  if [[ "$input" == "all" ]]; then
    MULTI_SELECTED=("${options[@]}")
    return 0
  fi

  IFS=',' read -ra picks <<< "$input"
  for p in "${picks[@]}"; do
    p="$(echo "$p" | tr -d ' ')"
    if [[ "$p" =~ ^[0-9]+$ ]] && (( p >= 1 && p <= count )); then
      MULTI_SELECTED+=("${options[$((p-1))]}")
    fi
  done
}

current_branch() { git rev-parse --abbrev-ref HEAD; }

branch_list() { git branch --format='%(refname:short)'; }

remote_list() { git remote; }

has_changes()     { ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; }
has_staged()      { ! git diff --cached --quiet 2>/dev/null; }
has_unstaged()    { ! git diff --quiet 2>/dev/null; }
has_untracked()   { [[ -n "$(git ls-files --others --exclude-standard 2>/dev/null)" ]]; }
has_anything()    { has_changes || has_untracked; }

# ── Pre-flight ───────────────────────────────────────────────────────────────

preflight() {
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    err "Not inside a git repository."
    exit 1
  fi
  ORIGINAL_BRANCH="$(current_branch)"
}

show_usage() {
  cat <<EOF
${BOLD}Git Flow Helper${RESET}  v${VERSION}

${BOLD}Usage:${RESET}  ./git-flow.sh [OPTIONS]

${BOLD}Options:${RESET}
  --dry-run    Show what would be run without executing git commands
  --help       Show this help message

${BOLD}Features:${RESET}
  • Review status & diff before staging
  • Stage all or select specific files
  • Commit with conventional prefixes (feat, fix, chore, …)
  • Amend the last commit
  • Stash / pop changes
  • Pull (with rebase) before pushing to avoid conflicts
  • Push to one or multiple remotes
  • Checkout other branches, merge, and push — in a loop
  • Create new branches on the fly
  • Create and push git tags
  • Return to your original branch when done

EOF
  exit 0
}

# ── Step 1: Status & Diff ────────────────────────────────────────────────────

step_status() {
  header "Working Tree Status"

  if ! has_anything && ! has_staged; then
    success "Working tree is clean — nothing to commit."
    return 1
  fi

  git status --short

  echo
  if confirm "Show full diff of unstaged changes?" "n"; then
    divider
    git diff --stat
    echo
    if confirm "Show line-by-line diff?" "n"; then
      git diff
    fi
  fi

  return 0
}

# ── Step 2: Staging ──────────────────────────────────────────────────────────

step_stage() {
  header "Stage Changes"

  if ! has_unstaged && ! has_untracked; then
    if has_staged; then
      info "All changes are already staged."
      return 0
    fi
    info "Nothing to stage."
    return 0
  fi

  select_one "How do you want to stage?" "Stage all changes" "Select specific files" "Skip staging"

  case "$SELECTED" in
    "Stage all changes")
      run_cmd git add .
      success "All changes staged."
      ;;
    "Select specific files")
      files=()
      while IFS= read -r line; do files+=("$line"); done < <(git status --short | awk '{print $NF}')
      select_multi "Select files to stage:" "${files[@]}"
      if (( ${#MULTI_SELECTED[@]} > 0 )); then
        for f in "${MULTI_SELECTED[@]}"; do
          run_cmd git add "$f"
        done
        success "Selected files staged."
      else
        warn "No files selected."
      fi
      ;;
    "Skip staging")
      info "Staging skipped."
      ;;
  esac
}

# ── Step 3: Commit ───────────────────────────────────────────────────────────

step_commit() {
  header "Commit"

  if ! has_staged; then
    warn "No staged changes to commit."
    return
  fi

  echo "Staged changes:"
  git diff --cached --stat
  echo

  select_one "What do you want to do?" "Create new commit" "Amend last commit" "Skip commit"

  case "$SELECTED" in
    "Create new commit")
      new_commit
      ;;
    "Amend last commit")
      amend_commit
      ;;
    "Skip commit")
      info "Commit skipped."
      ;;
  esac
}

new_commit() {
  local prefixes=("feat" "fix" "chore" "refactor" "docs" "style" "test" "perf" "ci" "build" "none")

  select_one "Commit type prefix:" "${prefixes[@]}"
  local prefix="$SELECTED"

  local scope=""
  read -r -p "$(printf "${YELLOW}?${RESET}  Scope ${DIM}(optional, e.g. auth, ui — press Enter to skip)${RESET}: ")" scope

  local msg=""
  while [[ -z "$msg" ]]; do
    read -r -p "$(printf "${YELLOW}?${RESET}  Commit message: ")" msg
    [[ -z "$msg" ]] && warn "Message cannot be empty."
  done

  local full_msg
  if [[ "$prefix" == "none" ]]; then
    full_msg="$msg"
  elif [[ -n "$scope" ]]; then
    full_msg="${prefix}(${scope}): ${msg}"
  else
    full_msg="${prefix}: ${msg}"
  fi

  echo
  info "Commit message: ${BOLD}${full_msg}${RESET}"
  if confirm "Proceed with commit?" "y"; then
    run_cmd git commit -m "$full_msg"
    success "Committed."
  else
    info "Commit cancelled."
  fi
}

amend_commit() {
  echo
  info "Last commit:"
  git log -1 --oneline --decorate
  echo

  if confirm "Amend staged changes into the last commit (keep message)?" "y"; then
    run_cmd git commit --amend --no-edit
    success "Last commit amended."
  else
    info "Amend cancelled."
  fi
}

# ── Step 4: Stash ────────────────────────────────────────────────────────────

step_stash() {
  local stash_count
  stash_count="$(git stash list 2>/dev/null | wc -l | tr -d ' ')"

  if ! has_anything && (( stash_count == 0 )); then
    return
  fi

  header "Stash Management"

  local opts=("Skip")
  has_anything && opts+=("Stash current changes")
  (( stash_count > 0 )) && opts+=("Pop latest stash" "List stashes" "Drop a stash")

  select_one "Stash options:" "${opts[@]}"

  case "$SELECTED" in
    "Stash current changes")
      local stash_msg=""
      read -r -p "$(printf "${YELLOW}?${RESET}  Stash message ${DIM}(optional)${RESET}: ")" stash_msg
      if [[ -n "$stash_msg" ]]; then
        run_cmd git stash push -m "$stash_msg"
      else
        run_cmd git stash push
      fi
      success "Changes stashed."
      ;;
    "Pop latest stash")
      run_cmd git stash pop
      success "Latest stash applied and dropped."
      ;;
    "List stashes")
      git stash list
      ;;
    "Drop a stash")
      git stash list
      local idx
      read -r -p "$(printf "${YELLOW}→${RESET} Stash index to drop (e.g. 0): ")" idx
      run_cmd git stash drop "stash@{$idx}"
      success "Stash dropped."
      ;;
    "Skip") ;;
  esac
}

# ── Step 5: Pull / Rebase ───────────────────────────────────────────────────

step_pull() {
  local branch
  branch="$(current_branch)"

  local tracking
  tracking="$(git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>/dev/null || true)"
  if [[ -z "$tracking" ]]; then
    return
  fi

  local remote_name="${tracking%%/*}"

  header "Sync with Remote"

  local local_hash remote_hash
  local_hash="$(git rev-parse HEAD)"
  run_cmd git fetch "$remote_name" "$branch" --quiet 2>/dev/null || true
  remote_hash="$(git rev-parse "$tracking" 2>/dev/null || echo "$local_hash")"

  if [[ "$local_hash" == "$remote_hash" ]]; then
    success "Already up to date with ${BOLD}${tracking}${RESET}."
    return
  fi

  local behind ahead
  behind="$(git rev-list --count HEAD.."$tracking" 2>/dev/null || echo 0)"
  ahead="$(git rev-list --count "$tracking"..HEAD 2>/dev/null || echo 0)"

  (( behind > 0 )) && warn "Local is ${BOLD}${behind}${RESET} commit(s) behind remote."
  (( ahead > 0 ))  && info "Local is ${BOLD}${ahead}${RESET} commit(s) ahead of remote."

  if (( behind > 0 )); then
    select_one "How to sync?" "Pull with rebase (recommended)" "Pull with merge" "Skip"
    case "$SELECTED" in
      "Pull with rebase"*)
        run_cmd git pull --rebase "$remote_name" "$branch"
        success "Rebased on top of remote."
        ;;
      "Pull with merge"*)
        run_cmd git pull "$remote_name" "$branch"
        success "Merged remote changes."
        ;;
      "Skip")
        warn "Skipped — push may fail if remote is ahead."
        ;;
    esac
  fi
}

# ── Step 6: Push ─────────────────────────────────────────────────────────────

step_push() {
  header "Push"

  local branch
  branch="$(current_branch)"

  remotes=()
  while IFS= read -r line; do remotes+=("$line"); done < <(remote_list)
  if (( ${#remotes[@]} == 0 )); then
    warn "No remotes configured; cannot push."
    return
  fi

  select_one "Push '${branch}' to:" "${remotes[@]}" "All remotes" "Skip push"

  case "$SELECTED" in
    "Skip push")
      info "Push skipped."
      return
      ;;
    "All remotes")
      for r in "${remotes[@]}"; do
        info "Pushing to ${BOLD}$r${RESET}..."
        run_cmd git push "$r" "$branch"
      done
      success "Pushed to all remotes."
      ;;
    *)
      run_cmd git push "$SELECTED" "$branch"
      success "Pushed to ${BOLD}$SELECTED${RESET}."
      ;;
  esac
}

# ── Step 7: Branch operations loop ──────────────────────────────────────────

step_branch_loop() {
  while true; do
    header "Branch Operations"

    select_one "What next?" \
      "Update another branch (checkout → merge → push)" \
      "Create a new branch" \
      "Delete a merged branch" \
      "Create a tag" \
      "View recent commits" \
      "Done — finish up"

    case "$SELECTED" in
      "Update another branch"*)  branch_update ;;
      "Create a new branch")     branch_create ;;
      "Delete a merged branch")  branch_delete ;;
      "Create a tag")            create_tag ;;
      "View recent commits")     view_log ;;
      "Done"*)                   break ;;
    esac
  done
}

branch_update() {
  branches=()
  while IFS= read -r line; do branches+=("$line"); done < <(branch_list)
  if (( ${#branches[@]} == 0 )); then
    warn "No local branches."
    return
  fi

  select_one "Checkout which branch?" "${branches[@]}"
  local target="$SELECTED"
  run_cmd git checkout "$target"

  sources=()
  while IFS= read -r line; do sources+=("$line"); done < <(branch_list)
  select_one "Merge which branch INTO '${target}'?" "${sources[@]}"
  local source="$SELECTED"

  if confirm "Merge '${source}' → '${target}'?" "y"; then
    if ! run_cmd git merge "$source"; then
      err "Merge conflict detected! Resolve conflicts, then re-run the script."
      exit 1
    fi
    success "Merged '${source}' into '${target}'."
  else
    info "Merge skipped."
    return
  fi

  if confirm "Push '${target}' to a remote?" "y"; then
    remotes=()
    while IFS= read -r line; do remotes+=("$line"); done < <(remote_list)
    if (( ${#remotes[@]} == 0 )); then
      warn "No remotes configured."
      return
    fi
    select_one "Push '${target}' to:" "${remotes[@]}" "All remotes"
    case "$SELECTED" in
      "All remotes")
        for r in "${remotes[@]}"; do
          run_cmd git push "$r" "$target"
        done
        ;;
      *)
        run_cmd git push "$SELECTED" "$target"
        ;;
    esac
    success "Pushed."
  fi
}

branch_create() {
  local name=""
  while [[ -z "$name" ]]; do
    read -r -p "$(printf "${YELLOW}?${RESET}  New branch name: ")" name
  done

  local base
  branches=()
  while IFS= read -r line; do branches+=("$line"); done < <(branch_list)
  select_one "Create from which branch?" "${branches[@]}"
  base="$SELECTED"

  run_cmd git checkout -b "$name" "$base"
  success "Created and switched to '${name}' (from '${base}')."

  if confirm "Push '${name}' to a remote with -u (set upstream)?" "n"; then
    remotes=()
    while IFS= read -r line; do remotes+=("$line"); done < <(remote_list)
    select_one "Select remote:" "${remotes[@]}"
    run_cmd git push -u "$SELECTED" "$name"
    success "Pushed and set upstream."
  fi
}

branch_delete() {
  branches=()
  while IFS= read -r line; do branches+=("$line"); done < <(branch_list)
  local current
  current="$(current_branch)"

  local -a deletable=()
  for b in "${branches[@]}"; do
    [[ "$b" != "$current" ]] && deletable+=("$b")
  done

  if (( ${#deletable[@]} == 0 )); then
    warn "No other branches to delete."
    return
  fi

  select_one "Delete which branch?" "${deletable[@]}"
  local target="$SELECTED"

  if confirm "Delete local branch '${target}'?" "n"; then
    if ! run_cmd git branch -d "$target" 2>/dev/null; then
      warn "Branch '${target}' is not fully merged."
      if confirm "Force-delete '${target}'? (unmerged commits will be lost)" "n"; then
        run_cmd git branch -D "$target"
        success "Force-deleted '${target}'."
      fi
    else
      success "Deleted '${target}'."
    fi

    if confirm "Also delete '${target}' from a remote?" "n"; then
      remotes=()
      while IFS= read -r line; do remotes+=("$line"); done < <(remote_list)
      select_one "Select remote:" "${remotes[@]}"
      run_cmd git push "$SELECTED" --delete "$target"
      success "Deleted '${target}' from remote '${SELECTED}'."
    fi
  fi
}

# ── Tags ─────────────────────────────────────────────────────────────────────

create_tag() {
  local tag_name=""
  while [[ -z "$tag_name" ]]; do
    read -r -p "$(printf "${YELLOW}?${RESET}  Tag name (e.g. v1.2.0): ")" tag_name
  done

  local tag_msg=""
  read -r -p "$(printf "${YELLOW}?${RESET}  Tag message ${DIM}(optional — leave empty for lightweight tag)${RESET}: ")" tag_msg

  if [[ -n "$tag_msg" ]]; then
    run_cmd git tag -a "$tag_name" -m "$tag_msg"
  else
    run_cmd git tag "$tag_name"
  fi
  success "Tag '${tag_name}' created."

  if confirm "Push tag to a remote?" "y"; then
    remotes=()
    while IFS= read -r line; do remotes+=("$line"); done < <(remote_list)
    select_one "Select remote:" "${remotes[@]}"
    run_cmd git push "$SELECTED" "$tag_name"
    success "Tag pushed."
  fi
}

# ── Log ──────────────────────────────────────────────────────────────────────

view_log() {
  local count=10
  read -r -p "$(printf "${YELLOW}?${RESET}  How many commits to show? [${count}]: ")" c
  count="${c:-$count}"
  echo
  git log --oneline --decorate --graph -n "$count"
}

# ── Finish ───────────────────────────────────────────────────────────────────

step_finish() {
  header "Wrap Up"

  local current
  current="$(current_branch)"

  if [[ "$current" != "$ORIGINAL_BRANCH" ]]; then
    if confirm "Return to your original branch '${ORIGINAL_BRANCH}'?" "y"; then
      run_cmd git checkout "$ORIGINAL_BRANCH"
      success "Back on '${ORIGINAL_BRANCH}'."
    else
      info "Staying on '${current}'."
    fi
  fi

  echo
  printf "${GREEN}${BOLD}All done!${RESET}\n"
  echo
}

# ── Main ─────────────────────────────────────────────────────────────────────

main() {
  for arg in "$@"; do
    case "$arg" in
      --dry-run) DRY_RUN=true ;;
      --help|-h) show_usage ;;
    esac
  done

  preflight

  $DRY_RUN && warn "Running in dry-run mode — no git commands will be executed."

  printf "\n${BOLD}${MAGENTA}  Git Flow Helper${RESET}  ${DIM}v${VERSION}${RESET}\n"
  printf "${DIM}  Branch: %s  •  Repo: %s${RESET}\n\n" "$(current_branch)" "$(basename "$(git rev-parse --show-toplevel)")"

  if step_status; then
    step_stash
    step_stage
    step_commit
  fi

  step_pull
  step_push
  step_branch_loop
  step_finish
}

main "$@"
