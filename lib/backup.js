
import { Product, Sale, Expense, SystemConfig } from './models';
import { connectDB } from './db';

export async function getBackupData() {
    await connectDB();

    try {
        const [products, sales, expenses] = await Promise.all([
            Product.find({}),
            Sale.find({}),
            Expense.find({})
        ]);

        return {
            timestamp: new Date().toISOString(),
            data: {
                products,
                sales,
                expenses
            }
        };
    } catch (error) {
        console.error("Failed to fetch backup data:", error);
        throw error;
    }
}

export async function checkAndRunWeeklyBackup() {
    await connectDB();
    try {
        const config = await SystemConfig.findOne({ key: 'last_backup' });
        const lastBackupDate = config ? new Date(config.value) : null;

        const now = new Date();
        const differenceInDays = lastBackupDate
            ? Math.floor((now - lastBackupDate) / (1000 * 60 * 60 * 24))
            : 8;

        if (differenceInDays >= 7) {
            console.log("Weekly backup threshold reached. Metadata updated in DB.");

            // In a Serverless environment, we don't save a file here.
            // We just update the metadata so the 'reminder' or automatic process 
            // knows the check was performed.

            await SystemConfig.findOneAndUpdate(
                { key: 'last_backup' },
                { value: now.toISOString() },
                { upsert: true }
            );

            return { success: true, message: "Backup metadata updated" };
        }

        return { success: true, message: "Backup not needed yet" };
    } catch (error) {
        console.error("Error checking backup status in DB:", error);
        return { success: false, error: error.message };
    }
}
