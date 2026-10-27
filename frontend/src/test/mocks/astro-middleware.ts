export const defineMiddleware = <T>(fn: T): T => fn;

type MiddlewareFn = (
  context: unknown,
  next: () => Promise<Response>
) => Promise<Response> | Response;

export const sequence = (...middlewares: MiddlewareFn[]) => {
  return (context: unknown, next: () => Promise<Response>) => {
    let index = -1;
    function dispatch(i: number): Promise<Response> {
      if (i <= index) return Promise.reject(new Error("next() called multiple times"));
      index = i;
      const fn = middlewares[i];
      if (!fn) return next();
      return Promise.resolve(fn(context, () => dispatch(i + 1)));
    }
    return dispatch(0);
  };
};
