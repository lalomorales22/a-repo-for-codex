"""
Gallery system for viewing and managing generated content
"""

from typing import List, Dict, Any, Optional
from pathlib import Path
import json


class Gallery:
    """Gallery for managing and displaying generated images and videos"""
    
    def __init__(self, database=None):
        from database import get_database
        self.db = database or get_database()
    
    def add_image(self, prompt: str, image_url: str = None,
                 image_path: str = None, metadata: Dict = None) -> int:
        """Add an image to the gallery"""
        return self.db.save_generated_image(prompt, image_url, image_path, metadata)
    
    def add_video(self, prompt: str, video_url: str = None,
                 video_path: str = None, metadata: Dict = None) -> int:
        """Add a video to the gallery"""
        return self.db.save_generated_video(prompt, video_url, video_path, metadata)
    
    def get_all_images(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all images in the gallery"""
        return self.db.list_generated_images(limit)
    
    def get_all_videos(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all videos in the gallery"""
        return self.db.list_generated_videos(limit)
    
    def get_image(self, image_id: int) -> Optional[Dict[str, Any]]:
        """Get a specific image"""
        return self.db.get_generated_image(image_id)
    
    def get_video(self, video_id: int) -> Optional[Dict[str, Any]]:
        """Get a specific video"""
        return self.db.get_generated_video(video_id)
    
    def display_gallery(self, content_type: str = "all"):
        """Display the gallery contents"""
        print("\n" + "="*60)
        print("📸 CODEX GALLERY")
        print("="*60 + "\n")
        
        if content_type in ("all", "images"):
            images = self.get_all_images()
            if images:
                print("🖼️  IMAGES:")
                print("-" * 60)
                for img in images:
                    print(f"\nID: {img['id']}")
                    print(f"Prompt: {img['prompt']}")
                    print(f"URL: {img['image_url'] or img['image_path'] or 'N/A'}")
                    print(f"Created: {img['created_at']}")
                    if img.get('metadata'):
                        print(f"Metadata: {json.dumps(img['metadata'], indent=2)}")
                print("\n")
            else:
                print("No images in gallery yet.\n")
        
        if content_type in ("all", "videos"):
            videos = self.get_all_videos()
            if videos:
                print("🎬 VIDEOS:")
                print("-" * 60)
                for vid in videos:
                    print(f"\nID: {vid['id']}")
                    print(f"Prompt: {vid['prompt']}")
                    print(f"URL: {vid['video_url'] or vid['video_path'] or 'N/A'}")
                    print(f"Created: {vid['created_at']}")
                    if vid.get('metadata'):
                        print(f"Metadata: {json.dumps(vid['metadata'], indent=2)}")
                print("\n")
            else:
                print("No videos in gallery yet.\n")
        
        print("="*60 + "\n")
    
    def search_by_prompt(self, search_term: str, content_type: str = "all") -> Dict[str, List]:
        """Search gallery by prompt text"""
        results = {'images': [], 'videos': []}
        
        if content_type in ("all", "images"):
            images = self.get_all_images()
            results['images'] = [
                img for img in images 
                if search_term.lower() in img['prompt'].lower()
            ]
        
        if content_type in ("all", "videos"):
            videos = self.get_all_videos()
            results['videos'] = [
                vid for vid in videos 
                if search_term.lower() in vid['prompt'].lower()
            ]
        
        return results
    
    def export_gallery_index(self, output_path: str = "gallery_index.json"):
        """Export gallery index as JSON"""
        images = self.get_all_images()
        videos = self.get_all_videos()
        
        gallery_data = {
            'images': images,
            'videos': videos,
            'total_images': len(images),
            'total_videos': len(videos)
        }
        
        with open(output_path, 'w') as f:
            json.dump(gallery_data, f, indent=2, default=str)
        
        print(f"Gallery index exported to {output_path}")
        return output_path


# Singleton instance
_gallery_instance = None

def get_gallery() -> Gallery:
    """Get or create gallery singleton instance"""
    global _gallery_instance
    if _gallery_instance is None:
        _gallery_instance = Gallery()
    return _gallery_instance
