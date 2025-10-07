"""
Database module for the Codex project
Uses SQLite to store all application data
"""

import sqlite3
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from pathlib import Path


class Database:
    """SQLite database manager for Codex"""
    
    def __init__(self, db_path: str = "codex.db"):
        self.db_path = db_path
        self.conn: Optional[sqlite3.Connection] = None
        self.init_database()
    
    def init_database(self):
        """Initialize the database with required tables"""
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row
        cursor = self.conn.cursor()
        
        # Code snippets table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS code_snippets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                code TEXT NOT NULL,
                language TEXT DEFAULT 'codex',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Generated images table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS generated_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prompt TEXT NOT NULL,
                image_url TEXT,
                image_path TEXT,
                metadata TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Generated videos table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS generated_videos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prompt TEXT NOT NULL,
                video_url TEXT,
                video_path TEXT,
                metadata TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Compilation results table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS compilation_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_code TEXT NOT NULL,
                object_code TEXT,
                success BOOLEAN,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # AI chat history table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_message TEXT NOT NULL,
                assistant_message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        self.conn.commit()
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
    
    # Code snippets methods
    def save_code_snippet(self, name: str, code: str, language: str = 'codex') -> int:
        """Save a code snippet"""
        cursor = self.conn.cursor()
        cursor.execute('''
            INSERT INTO code_snippets (name, code, language)
            VALUES (?, ?, ?)
        ''', (name, code, language))
        self.conn.commit()
        return cursor.lastrowid
    
    def get_code_snippet(self, snippet_id: int) -> Optional[Dict[str, Any]]:
        """Get a code snippet by ID"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM code_snippets WHERE id = ?', (snippet_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    
    def list_code_snippets(self) -> List[Dict[str, Any]]:
        """List all code snippets"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM code_snippets ORDER BY created_at DESC')
        return [dict(row) for row in cursor.fetchall()]
    
    # Generated images methods
    def save_generated_image(self, prompt: str, image_url: str = None, 
                            image_path: str = None, metadata: Dict = None) -> int:
        """Save a generated image"""
        cursor = self.conn.cursor()
        metadata_json = json.dumps(metadata) if metadata else None
        cursor.execute('''
            INSERT INTO generated_images (prompt, image_url, image_path, metadata)
            VALUES (?, ?, ?, ?)
        ''', (prompt, image_url, image_path, metadata_json))
        self.conn.commit()
        return cursor.lastrowid
    
    def get_generated_image(self, image_id: int) -> Optional[Dict[str, Any]]:
        """Get a generated image by ID"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM generated_images WHERE id = ?', (image_id,))
        row = cursor.fetchone()
        if row:
            result = dict(row)
            if result.get('metadata'):
                result['metadata'] = json.loads(result['metadata'])
            return result
        return None
    
    def list_generated_images(self, limit: int = 50) -> List[Dict[str, Any]]:
        """List generated images"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM generated_images ORDER BY created_at DESC LIMIT ?', (limit,))
        results = []
        for row in cursor.fetchall():
            result = dict(row)
            if result.get('metadata'):
                result['metadata'] = json.loads(result['metadata'])
            results.append(result)
        return results
    
    # Generated videos methods
    def save_generated_video(self, prompt: str, video_url: str = None,
                            video_path: str = None, metadata: Dict = None) -> int:
        """Save a generated video"""
        cursor = self.conn.cursor()
        metadata_json = json.dumps(metadata) if metadata else None
        cursor.execute('''
            INSERT INTO generated_videos (prompt, video_url, video_path, metadata)
            VALUES (?, ?, ?, ?)
        ''', (prompt, video_url, video_path, metadata_json))
        self.conn.commit()
        return cursor.lastrowid
    
    def get_generated_video(self, video_id: int) -> Optional[Dict[str, Any]]:
        """Get a generated video by ID"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM generated_videos WHERE id = ?', (video_id,))
        row = cursor.fetchone()
        if row:
            result = dict(row)
            if result.get('metadata'):
                result['metadata'] = json.loads(result['metadata'])
            return result
        return None
    
    def list_generated_videos(self, limit: int = 50) -> List[Dict[str, Any]]:
        """List generated videos"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM generated_videos ORDER BY created_at DESC LIMIT ?', (limit,))
        results = []
        for row in cursor.fetchall():
            result = dict(row)
            if result.get('metadata'):
                result['metadata'] = json.loads(result['metadata'])
            results.append(result)
        return results
    
    # Compilation results methods
    def save_compilation_result(self, source_code: str, object_code: str = None,
                               success: bool = True, error_message: str = None) -> int:
        """Save a compilation result"""
        cursor = self.conn.cursor()
        cursor.execute('''
            INSERT INTO compilation_results (source_code, object_code, success, error_message)
            VALUES (?, ?, ?, ?)
        ''', (source_code, object_code, success, error_message))
        self.conn.commit()
        return cursor.lastrowid
    
    def get_compilation_result(self, result_id: int) -> Optional[Dict[str, Any]]:
        """Get a compilation result by ID"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM compilation_results WHERE id = ?', (result_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    
    # Chat history methods
    def save_chat_message(self, user_message: str, assistant_message: str) -> int:
        """Save a chat exchange"""
        cursor = self.conn.cursor()
        cursor.execute('''
            INSERT INTO chat_history (user_message, assistant_message)
            VALUES (?, ?)
        ''', (user_message, assistant_message))
        self.conn.commit()
        return cursor.lastrowid
    
    def get_chat_history(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get chat history"""
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM chat_history ORDER BY created_at DESC LIMIT ?', (limit,))
        return [dict(row) for row in cursor.fetchall()]


# Singleton instance
_db_instance = None

def get_database(db_path: str = "codex.db") -> Database:
    """Get or create database singleton instance"""
    global _db_instance
    if _db_instance is None:
        _db_instance = Database(db_path)
    return _db_instance
