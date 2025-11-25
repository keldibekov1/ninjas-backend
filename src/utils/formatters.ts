export const formatBytes = (bytes: number, decimals: number = 2) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const taskKeyGenerator = (text: string) => {
  return text.replace(/[^a-zA-Z]/g, '').toLowerCase();
};

export const formatTime = (timeInMilliseconds: number) => {
  if (timeInMilliseconds < 1000) {
    return `${timeInMilliseconds} ms`;
  } else if (timeInMilliseconds < 60000) {
    return `${(timeInMilliseconds / 1000).toFixed(2)} seconds`;
  } else {
    const minutes = Math.floor(timeInMilliseconds / 60000);
    const seconds: any = ((timeInMilliseconds % 60000) / 1000).toFixed(0);
    return `${
      minutes > 0 ? minutes + ' minute' + (minutes > 1 ? 's' : '') : ''
    } ${seconds > 0 ? seconds + ' seconds' : ''}`;
  }
};

export const tokenFormatter = (token: string) => {
  return token && token.split(' ')[1];
};

export const unixTimestampToISO8601 = (unixTimestamp: number) => {
  const date = new Date(unixTimestamp * 1000);
  return date.toISOString();
};
