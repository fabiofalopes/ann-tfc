# Update to Node 18
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install
RUN npm install axios

# Copy the rest of the application code
COPY . .

# Expose the React port
EXPOSE 3721

# Define the command to run the React application
CMD ["npm", "start"]