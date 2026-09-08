declare module '*.png' {
  const value: number;
  export default value;
}

declare module '*.json' {
  const value: {
    PUBLIC_KEY?: string;
    API_KEY?: string;
    API_BASE?: string;
    CURRENCY?: string;
    DESCRIPTION?: string;
  };
  export default value;
}
