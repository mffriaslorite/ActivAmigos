import uuid
import os
from minio import Minio
from minio.error import S3Error
from flask import current_app
from PIL import Image
import io

class MinIOClient:
    def __init__(self):
        self.client = None
        self._initialized = False
    
    def _initialize_client(self):
        """Initialize MinIO client with configuration"""
        if self._initialized:
            return
            
        try:
            self.client = Minio(
                current_app.config['MINIO_ENDPOINT'],
                access_key=current_app.config['MINIO_ACCESS_KEY'],
                secret_key=current_app.config['MINIO_SECRET_KEY'],
                secure=current_app.config['MINIO_SECURE']
            )
            
            # Create bucket if it doesn't exist
            bucket_name = current_app.config['MINIO_BUCKET_NAME']
            if not self.client.bucket_exists(bucket_name):
                self.client.make_bucket(bucket_name)
                
            self._initialized = True
                
        except Exception as e:
            current_app.logger.error(f"Failed to initialize MinIO client: {e}")
            raise
    
    def _ensure_initialized(self):
        """Ensure the client is initialized before use"""
        if not self._initialized:
            self._initialize_client()
    
    def upload_profile_image(self, file_data, user_id, content_type):
        """
        Upload profile image to MinIO
        Args:
            file_data: Binary file data
            user_id: User ID for folder structure
            content_type: MIME type of the file
        Returns:
            str: URL of the uploaded file
        """
        self._ensure_initialized()
        
        try:
            # Validate and process image
            if not self._is_valid_image_type(content_type):
                raise ValueError("Invalid image type. Only JPG, PNG, and WebP are allowed.")
            
            # Process image (resize if needed)
            processed_image = self._process_image(file_data)
            
            # Generate unique filename
            file_extension = self._get_file_extension(content_type)
            filename = f"profile_images/{user_id}/{uuid.uuid4()}{file_extension}"
            
            # Upload to MinIO
            bucket_name = current_app.config['MINIO_BUCKET_NAME']
            self.client.put_object(
                bucket_name,
                filename,
                io.BytesIO(processed_image),
                length=len(processed_image),
                content_type=content_type
            )
            
            # Return public URL
            return self._get_public_url(filename)
            
        except S3Error as e:
            current_app.logger.error(f"MinIO upload error: {e}")
            raise Exception("Failed to upload image to storage")
        except Exception as e:
            current_app.logger.error(f"Image upload error: {e}")
            raise
    
    def delete_profile_image(self, image_url):
        """Delete profile image from MinIO"""
        self._ensure_initialized()
        
        try:
            # Extract filename from URL
            filename = self._extract_filename_from_url(image_url)
            if filename:
                bucket_name = current_app.config['MINIO_BUCKET_NAME']
                self.client.remove_object(bucket_name, filename)
        except Exception as e:
            current_app.logger.warning(f"Failed to delete image: {e}")
    
    def _is_valid_image_type(self, content_type):
        """Check if the content type is a valid image type"""
        valid_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        return content_type.lower() in valid_types
    
    def _get_file_extension(self, content_type):
        """Get file extension from content type"""
        type_map = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp'
        }
        return type_map.get(content_type.lower(), '.jpg')
    
    def _process_image(self, file_data):
        """Process image: resize and optimize"""
        try:
            # Open image with PIL
            image = Image.open(io.BytesIO(file_data))
            
            # Convert to RGB if necessary (for JPEG)
            if image.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background
            
            # Resize if too large (max 800x800)
            max_size = (800, 800)
            if image.size[0] > max_size[0] or image.size[1] > max_size[1]:
                image.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Save optimized image
            output = io.BytesIO()
            image.save(output, format='JPEG', quality=85, optimize=True)
            return output.getvalue()
            
        except Exception as e:
            current_app.logger.error(f"Image processing error: {e}")
            raise ValueError("Invalid image file")
    
    def _get_public_url(self, filename):
        """Get public URL for the uploaded file"""
        endpoint = current_app.config['MINIO_ENDPOINT']
        bucket_name = current_app.config['MINIO_BUCKET_NAME']
        protocol = "https" if current_app.config['MINIO_SECURE'] else "http"
        return f"{protocol}://{endpoint}/{bucket_name}/{filename}"
    
    def _extract_filename_from_url(self, url):
        """Extract filename from MinIO URL"""
        try:
            bucket_name = current_app.config['MINIO_BUCKET_NAME']
            if bucket_name in url:
                return url.split(f"{bucket_name}/", 1)[1]
        except:
            pass
        return None

minio_client = MinIOClient()