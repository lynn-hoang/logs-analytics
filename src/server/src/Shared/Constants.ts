import path from 'path';

export const Constants = {
  DATA_DIR: path.join(__dirname, '../../data'),
  SIGNATURES_DB: 'signatures.db',

  get signaturesDbPath(): string {
    return path.join(this.DATA_DIR, this.SIGNATURES_DB);
  }
};
