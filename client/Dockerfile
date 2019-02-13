
FROM node:apline as builder
WORKDIR '/app'
COPY ./package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx
EXPOSE 3000
# copy over config and overwrite
COPY ./nginx/default.conf /etc/nginx.confd/default.conf
# copy over production assets from build phase
COPY --from=builder /app/build /usr/share/nginx/html