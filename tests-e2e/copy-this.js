// 이 파일을 브라우저 콘솔에 복사하세요

const cookies = document.cookie.split(';').map(cookieString => {
  const parts = cookieString.trim().split('=');
  const name = parts[0];
  const value = parts.slice(1).join('=');

  return {
    name: name,
    value: value,
    domain: '.vercel.app',
    path: '/',
    expires: -1,
    httpOnly: false,
    secure: true,
    sameSite: 'Lax'
  };
});

const storageState = {
  cookies: cookies,
  origins: []
};

console.log(JSON.stringify(storageState, null, 2));
