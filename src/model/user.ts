export interface User {
    id: number,
    username: string,
    password: string,
    roles: number[],
    email: string,
    verified: number,
    total_score: number,
    rank: number,
    role_id: number
}