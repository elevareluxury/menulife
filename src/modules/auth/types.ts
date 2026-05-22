export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  fullName: string
  restaurantName: string
}

export interface AuthError {
  message: string
  code?: string
}
