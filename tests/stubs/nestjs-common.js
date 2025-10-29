export class BadRequestException extends Error {
  constructor(message) {
    super(message);
    this.name = 'BadRequestException';
  }
}

export class NotFoundException extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundException';
  }
}

export function Injectable() {
  return function () {
    /* noop decorator */
  };
}
