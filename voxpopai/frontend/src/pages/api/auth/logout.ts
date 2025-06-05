import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // ALB will handle the actual logout
  // This endpoint just redirects to the ALB logout endpoint
  res.redirect(307, `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/logout`);
} 