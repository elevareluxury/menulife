// splitting no trae tipos: la landing lo usa como función global (ver components/landing/landingLibs.ts)
declare module 'splitting' {
  const Splitting: (options?: Record<string, unknown>) => unknown[]
  export default Splitting
}
