FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ openssl openssl-dev

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

CMD ["sh", "-c", "npx prisma db push --skip-generate && npx ts-node prisma/seed.ts && npm run start:dev"]

EXPOSE 3000
