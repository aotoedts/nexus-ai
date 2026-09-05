import jwt from 'jsonwebtoken';

const token = jwt.sign(
  {
    sub: '10fbe100-4ef6-49a1-a540-b61c90dc34f6',
    email: 'testefinal4000@gmail.com',
    role: 'USER'
  },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

console.log(token);
