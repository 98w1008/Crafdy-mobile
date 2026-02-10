let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

export function hasValidJwt(token?: string | null) {
  return !!token && token.startsWith('eyJ') && token.length > 100
}
