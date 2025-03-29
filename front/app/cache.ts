export class Cache<T> {
  private cache: T;
  private updatedAt: Date | undefined;

  constructor(private readonly setter: () => T, private readonly ttl: number) {
    this.setter = setter;
    this.cache = setter();
  }

  invalidate() {
    this.setter();
    this.updatedAt = new Date();
  }

  isExpired() {
    const now = new Date();
    return (
      !this.updatedAt || now.getTime() - this.updatedAt.getTime() > this.ttl
    );
  }

  get() {
    if (this.isExpired()) {
      this.cache = this.setter();
    }
    return this.cache;
  }
}
