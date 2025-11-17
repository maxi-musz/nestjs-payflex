import { BadRequestException, Logger } from '@nestjs/common';

/**
 * ID Validator Helper
 * Validates BVN and NIN formats
 */
export class IdValidator {
  private static readonly logger = new Logger(IdValidator.name);

  /**
   * Validate BVN format (11 digits)
   */
  static validateBVN(bvn: string): boolean {
    // BVN must be exactly 11 digits
    const bvnRegex = /^[0-9]{11}$/;
    return bvnRegex.test(bvn);
  }

  /**
   * Validate NIN format (11 digits)
   */
  static validateNIN(nin: string): boolean {
    // NIN must be exactly 11 digits
    const ninRegex = /^[0-9]{11}$/;
    return ninRegex.test(nin);
  }

  /**
   * Validate ID number based on type
   */
  static validateIdNumber(idType: 'BVN' | 'NIN', idNumber: string): void {
    if (!idNumber || idNumber.trim().length === 0) {
      IdValidator.logger.error('ID number is required');
      throw new BadRequestException('ID number is required');
    }

    // Remove any spaces or dashes
    const cleanedId = idNumber.replace(/[\s-]/g, '');

    if (idType === 'BVN') {
      if (!IdValidator.validateBVN(cleanedId)) {
        IdValidator.logger.error(`Invalid BVN format: ${idNumber}`);
        throw new BadRequestException(
          'BVN must be exactly 11 digits. Please check and try again.',
        );
      }
    } else if (idType === 'NIN') {
      if (!IdValidator.validateNIN(cleanedId)) {
        IdValidator.logger.error(`Invalid NIN format: ${idNumber}`);
        throw new BadRequestException(
          'NIN must be exactly 11 digits. Please check and try again.',
        );
      }
    } else {
      IdValidator.logger.error(`Unsupported ID type: ${idType}`);
      throw new BadRequestException(`Unsupported ID type: ${idType}`);
    }
  }

  /**
   * Format ID number (remove spaces and dashes)
   */
  static formatIdNumber(idNumber: string): string {
    return idNumber.replace(/[\s-]/g, '');
  }
}

