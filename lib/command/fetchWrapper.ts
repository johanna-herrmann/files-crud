const doFetch = async function (url: string, options: Record<string, unknown>) {
  return await fetch(url, options);
};

export { doFetch };
