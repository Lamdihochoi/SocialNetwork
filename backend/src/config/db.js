import mongoose from "mongoose";
import { ENV } from "./env.js";

export const connectDB = async () => {
  try {
    await mongoose.connect(ENV.MONGO_URI);
    console.log("Connected to DB SUCCESSFULLY ✅");
    
    // 🔧 Fix: Xóa index lỗi participants_1 nếu tồn tại
    try {
      const db = mongoose.connection.db;
      const conversationsCollection = db.collection("conversations");
      const indexes = await conversationsCollection.indexes();
      
      // Tìm và xóa index participants_1 (unique) gây lỗi
      const badIndex = indexes.find(idx => 
        idx.name === "participants_1" && idx.unique === true
      );
      
      if (badIndex) {
        await conversationsCollection.dropIndex("participants_1");
        console.log("🗑️ Dropped problematic participants_1 unique index");
      }
    } catch (indexError) {
      // Bỏ qua nếu index không tồn tại
      if (indexError.code !== 27) { // 27 = IndexNotFound
        console.log("Index cleanup note:", indexError.message);
      }
    }
  } catch (error) {
    console.log("Error connecting to MONGODB");
    process.exit(1);
  }
};