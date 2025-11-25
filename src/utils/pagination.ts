export const startIndex = (page: number, limit: number) => {
  return Math.max(page - 1) * limit;
};

export const metaData = (
  page: number = 1,
  limit: number = 10,
  dataLength: number,
  dataNameKey: string,
) => {
  const total_pages = dataLength > +limit ? Math.ceil(dataLength / +limit) : 1;

  return {
    currentPage: +page,
    limit: +limit,
    total_pages: total_pages,
    [dataNameKey ? dataNameKey : 'dataLength']: dataLength,
  };
};
