import mongoose, { Schema } from 'mongoose';

const EnrollmentBackupSchema = new Schema({
  backed_up_at: { type: Date, default: Date.now },
  original: { type: Schema.Types.Mixed, required: true },
});

const EnrollmentBackup = mongoose.models.EnrollmentBackup
  ?? mongoose.model('EnrollmentBackup', EnrollmentBackupSchema);

export default EnrollmentBackup;
