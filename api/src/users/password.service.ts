import { Injectable } from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

interface ScryptParameters {
  cost: number;
  blockSize: number;
  parallelization: number;
  keyLength: number;
}

const defaultParameters: ScryptParameters = {
  cost: 16_384,
  blockSize: 8,
  parallelization: 1,
  keyLength: 64,
};

@Injectable()
export class PasswordService {
  hash(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = this.deriveKey(password, salt, defaultParameters).toString(
      'hex',
    );

    return [
      'scrypt',
      `N=${defaultParameters.cost}`,
      `r=${defaultParameters.blockSize}`,
      `p=${defaultParameters.parallelization}`,
      `keylen=${defaultParameters.keyLength}`,
      salt,
      hash,
    ].join(':');
  }

  verify(password: string, storedHash: string): boolean {
    const parsed = this.parse(storedHash);

    if (!parsed) {
      return false;
    }

    const candidate = this.deriveKey(
      password,
      parsed.salt,
      parsed.parameters,
    );
    const expected = Buffer.from(parsed.hash, 'hex');

    return (
      candidate.length === expected.length && timingSafeEqual(candidate, expected)
    );
  }

  private deriveKey(
    password: string,
    salt: string,
    parameters: ScryptParameters,
  ): Buffer {
    return scryptSync(password, salt, parameters.keyLength, {
      N: parameters.cost,
      r: parameters.blockSize,
      p: parameters.parallelization,
      maxmem: 32 * 1024 * 1024,
    });
  }

  private parse(storedHash: string):
    | {
        parameters: ScryptParameters;
        salt: string;
        hash: string;
      }
    | null {
    const parts = storedHash.split(':');

    if (parts.length === 3 && parts[0] === 'scrypt') {
      return {
        parameters: defaultParameters,
        salt: parts[1],
        hash: parts[2],
      };
    }

    if (parts.length !== 7 || parts[0] !== 'scrypt') {
      return null;
    }

    const parameters = {
      cost: Number(parts[1].replace('N=', '')),
      blockSize: Number(parts[2].replace('r=', '')),
      parallelization: Number(parts[3].replace('p=', '')),
      keyLength: Number(parts[4].replace('keylen=', '')),
    };

    if (Object.values(parameters).some((value) => !Number.isInteger(value))) {
      return null;
    }

    return {
      parameters,
      salt: parts[5],
      hash: parts[6],
    };
  }
}
