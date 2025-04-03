import { Injectable, OnModuleInit } from '@nestjs/common';
import * as cron from 'node-cron';
import axios from 'axios';
import * as colors from 'colors'

@Injectable()
export class CronService implements OnModuleInit {
    onModuleInit() {
        console.log(colors.blue("Initializing cron job..."));

        cron.schedule('*/3 * * * *', async () => {  // Runs every 3 minutes
            try {
                console.log("Pinging service to keep alive...");
                await axios.get('https://nestjs-payflex.onrender.com/api/v1/auth/health'); // Replace with your actual endpoint
                console.log(colors.america("Service is up"));
            } catch (error) {
                console.error("Failed to ping service:", error.message);
            }
        });
    }
}
