/**
 * 轻量级前端串行微队列
 * 保证所有排入的文件写/删异步任务严格单线程串行执行，杜绝后端并发写竞争
 */
class SerialQueue {
  private queue: Promise<unknown> = Promise.resolve();

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue = this.queue
        .then(() => task())
        .then(resolve)
        .catch(reject);
    });
  }
}

export const fileOpQueue = new SerialQueue();
