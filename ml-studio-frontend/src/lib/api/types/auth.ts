export interface UserPrivate {
  id: number
  username: string
  image_file: string | null
  image_path: string
  email: string
}

export interface UserPublic {
  id: number
  username: string
  image_file: string | null
  image_path: string
}

export interface Token {
  access_token: string
  token_type: string
}

export interface UserCreate {
  username: string
  email: string
  password: string
}

export interface UserUpdate {
  username?: string
  email?: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  new_password: string
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}