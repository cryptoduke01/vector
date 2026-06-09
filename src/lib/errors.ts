export class VectorError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "VectorError";
    this.code = code;
  }
}
