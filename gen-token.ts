import jwt from 'jsonwebtoken';
const JWT_SECRET = '2d6ca17b8fdc8bb23548f78e7501e8bb0f8ab0ac5162c4c296d1d1c6423a7886345c702094260294641bd4cad1cdb559245163ab275b92dfbd39a77ff349a674';

const token = jwt.sign(
  { id: 'test-admin', email: 'admin@example.com', role: 'ADMIN' },
  JWT_SECRET
);

console.log(token);
