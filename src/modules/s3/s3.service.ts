import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  S3Client, 
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand, 
  GetObjectCommandOutput
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;
  

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.getOrThrow<string>('AWS_BUCKET_NAME');
    this.region = this.configService.getOrThrow<string>('AWS_REGION');
    
    this.s3Client = new S3Client({
      region: this.region, 
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  private extractKeyFromUrl(url: string): string {
    const urlObj = new URL(url.startsWith('http') ? url : `http://dummy.com${url}`);
    return urlObj.pathname.slice(1);
  }
  
  async getFileStream(url: string): Promise<Readable> {
    try {
      const key = this.extractKeyFromUrl(url);
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });
  
      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('Empty response from S3');
      }
      
      const chunks: Uint8Array[] = [];
      const stream = response.Body as Readable;
      
      return new Promise((resolve, reject) => {
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const newStream = new Readable();
          newStream.push(buffer);
          newStream.push(null);
          resolve(newStream);
        });
      });
    } catch (error) {
      console.error('S3 stream error:', error);
      throw new Error(`Failed to get file from S3: ${error.message}`);
    }
  }

  async getFileMetadataAndStream(url: string): Promise<{
    stream: Readable;
    contentType: string;
    contentLength?: number;
  }> {
    try {
      const key = this.extractKeyFromUrl(url);
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const response: GetObjectCommandOutput = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('Empty response from S3');
      }

      return {
        stream: response.Body as Readable,
        contentType: response.ContentType || 'application/octet-stream',
        contentLength: response.ContentLength,
      };
    } catch (error) {
      console.error('S3 metadata error:', error);
      throw new Error(`Failed to get file metadata from S3: ${error.message}`);
    }
  }


  async uploadFile(
    fileBuffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    try {
      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        ACL: 'public-read', 
      });

      await this.s3Client.send(uploadCommand);
      
      const publicUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

      return publicUrl; 
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Failed to upload file to S3'
      );
    }
  }

  async getSignedUrl(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, {
        expiresIn: 7 * 24 * 60 * 60 // 7 days
      });
      
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Failed to generate signed URL'
      );
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Failed to delete file from S3'
      );
    }
  }
}