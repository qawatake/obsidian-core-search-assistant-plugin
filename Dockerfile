FROM node:17-bullseye

RUN apt update && apt install -y less

CMD ["bash"]
