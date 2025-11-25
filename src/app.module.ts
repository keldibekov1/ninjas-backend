// app.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

// Import modules
import { PrismaModule } from './modules/prisma/prisma.module';
import { ApiPpwModule } from './modules/api-ppw/api-ppw.module';
import { OrdersModule } from './modules/orders/orders.module';
import { TaskModule } from './modules/task/task.module';
import { WorkerModule } from './modules/worker/worker.module';
import { PermissionModule } from './modules/permission/permission.module';
// import { RoleModule } from './modules/role/role.module';
import { AdminModule } from './modules/admin/admin.module';
import { AssignmentModule } from './modules/assignment/assignment.module';
import { JobNotesModule } from './modules/job-notes/job-notes.module';
import { ExpenseModule } from './modules/expense/expense.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ShiftsModule } from './modules/shift/shifts.module';
import { TaskitemsModule } from './modules/taskitems/taskitems.module';
import { BidPhotosModule } from './modules/bid-photos/bid-photos.module';
import { S3Module } from './modules/s3/s3.module';
import { FormsDocsModule } from './modules/forms-docs/forms-docs.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AutoClockoutService } from './modules/shift/services/auto-clockout.service';
import { AutoClockoutModule } from './modules/shift/services/auto-clockout.module';
import { GlobalAdminModule } from './modules/global-admin/global-admin.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { MapsModule } from './modules/maps/maps.module'; 
import { AuthModule } from './modules/auth/auth.module';
import { ExpenseCategorysModule } from './modules/expensecategory/expensecategory.module';
import { StripeModule } from './stripe/stripe.module';
import { BouncieModule } from './modules/bouncie/bouncie.module';
import { CrewModule } from './modules/crew/crew.module';


@Module({
  imports: [
    CrewModule,
    ExpenseCategorysModule,
    MapsModule,
    AuthModule,
    TenantModule,
    GlobalAdminModule,
    AutoClockoutModule,
    PrismaModule,
    ApiPpwModule,
    OrdersModule,
    TaskModule,
    WorkerModule,
    PermissionModule,
    // RoleModule,
    AdminModule,
    AssignmentModule,
    JobNotesModule,
    ExpenseModule,
    ReportsModule,
    ShiftsModule,
    TaskitemsModule,
    BidPhotosModule,
    S3Module,
    BouncieModule,
    StripeModule,
    MulterModule.register({
      storage: memoryStorage(), // Use memory storage since we'll stream to S3
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 50 // Maximum 50 files per upload
      },
    }),
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(), // Enable cron jobs
    FormsDocsModule,
  ],
  providers: [AutoClockoutService],
  
})
export class AppModule {}
