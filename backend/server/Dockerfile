FROM node:18

# Install Python
RUN apt-get update && apt-get install -y python3 python3-pip

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy all files
COPY . .

# Install Python dependencies
RUN pip3 install yfinance scikit-learn pandas numpy --break-system-packages

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "server.js"]
