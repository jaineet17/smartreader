from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
import hashlib
import sqlite3
import datetime
import logging
import requests
from bs4 import BeautifulSoup
from threading import Thread
from transformers import pipeline
import re
import uuid

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='static')
CORS(app)

# Database setup
DB_PATH = os.environ.get('DB_PATH', 'smartreader.db')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create summaries table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS summaries (
        id TEXT PRIMARY KEY,
        title TEXT,
        content_preview TEXT,
        summary TEXT,
        url TEXT,
        created_at TEXT,
        is_public INTEGER DEFAULT 0
    )
    ''')
    
    # Create questions table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        summary_id TEXT,
        question TEXT,
        answer TEXT,
        created_at TEXT,
        FOREIGN KEY (summary_id) REFERENCES summaries (id)
    )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database
init_db()

# We'll use Hugging Face models to avoid costs
try:
    # Load model asynchronously to speed up startup time
    def load_models():
        global summarizer
        logger.info("Loading models... this might take a minute")
        summarizer = pipeline("summarization", model="facebook/bart-large-cnn", device=-1)  # Force CPU
        logger.info("Models loaded successfully")

    model_thread = Thread(target=load_models)
    model_thread.start()
    summarizer = None
except Exception as e:
    logger.error(f"Error loading models: {str(e)}")
    summarizer = None

@app.route("/", methods=["GET"])
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory(app.static_folder, path)

@app.route("/api/status", methods=["GET"])
def health_check():
    if summarizer is None:
        # Models still loading
        return jsonify({"status": "initializing", "message": "Models are still loading"}), 200
    return jsonify({"status": "ok"}), 200

@app.route("/api/extract", methods=["POST"])
def extract_content():
    if not request.json or "url" not in request.json:
        return jsonify({"error": "No URL provided"}), 400
    
    url = request.json["url"]
    if not url:
        return jsonify({"error": "Empty URL provided"}), 400
    
    try:
        # Add user agent to avoid being blocked
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36"
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Parse the HTML content
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Get the title
        title = soup.title.text if soup.title else "Untitled Article"
        
        # Try to extract the main article content
        article = ""
        
        # First look for article tag
        article_tag = soup.find('article')
        if article_tag:
            article = article_tag.get_text(separator=' ', strip=True)
        
        # If no article tag, try common content divs
        if not article:
            for selector in ['#content', '.content', '#main', '.main', '.post', '.article']:
                content_div = soup.select_one(selector)
                if content_div:
                    article = content_div.get_text(separator=' ', strip=True)
                    break
        
        # If still no content, use the body but remove scripts, styles, etc.
        if not article:
            for script in soup(["script", "style", "header", "footer", "nav"]):
                script.extract()
            article = soup.body.get_text(separator=' ', strip=True)
        
        # Clean up the text
        article = re.sub(r'\s+', ' ', article).strip()
        
        # Limit to first 8000 chars for preview and processing
        preview = article[:200] + "..." if len(article) > 200 else article
        if len(article) > 8000:
            article = article[:8000]
        
        return jsonify({
            "title": title,
            "content": article,
            "preview": preview,
            "url": url
        })
    
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching URL {url}: {str(e)}")
        return jsonify({"error": f"Could not fetch the URL: {str(e)}"}), 400
    except Exception as e:
        logger.error(f"Error processing URL {url}: {str(e)}")
        return jsonify({"error": f"Error processing the page: {str(e)}"}), 500

@app.route("/api/summarize", methods=["POST"])
def summarize():
    if summarizer is None:
        # If the models are still loading, return a message
        return jsonify({"error": "Server is still initializing, please try again in a minute"}), 503
    
    # Check if we're receiving text or a URL
    if not request.json:
        return jsonify({"error": "No content provided"}), 400
    
    text = ""
    title = "Untitled"
    url = None
    
    if "text" in request.json:
        text = request.json["text"]
        if "title" in request.json:
            title = request.json["title"]
    elif "url" in request.json:
        # Extract content from URL
        url = request.json["url"]
        try:
            extract_response = extract_content(url)
            if "error" in extract_response.json:
                return extract_response
            
            extracted_data = extract_response.json
            text = extracted_data["content"]
            title = extracted_data["title"]
        except Exception as e:
            return jsonify({"error": f"Error extracting content from URL: {str(e)}"}), 500
    else:
        return jsonify({"error": "Either text or URL must be provided"}), 400
    
    if not text or len(text.strip()) < 50:
        return jsonify({"error": "Text too short to summarize"}), 400
    
    # Generate a unique ID
    summary_id = str(uuid.uuid4())
    
    try:
        # Generate summary
        logger.info(f"Generating summary for text ({len(text)} chars)")
        
        # Process with the model
        summary_output = summarizer(text, max_length=150, min_length=30, do_sample=False)
        summary_text = summary_output[0]["summary_text"]
        
        # Store in database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        created_at = datetime.datetime.now().isoformat()
        
        cursor.execute(
            "INSERT INTO summaries (id, title, content_preview, summary, url, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (summary_id, title, text[:200] + "..." if len(text) > 200 else text, summary_text, url, created_at)
        )
        
        conn.commit()
        conn.close()
        
        return jsonify({
            "id": summary_id,
            "title": title,
            "summary": summary_text,
            "created_at": created_at
        })
    except Exception as e:
        logger.error(f"Error in summarization: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/answer", methods=["POST"])
def answer():
    if summarizer is None:
        return jsonify({"error": "Server is still initializing, please try again in a minute"}), 503
    
    if not request.json or "question" not in request.json:
        return jsonify({"error": "Missing question"}), 400
    
    question = request.json["question"]
    summary_id = request.json.get("summary_id")
    
    if not question:
        return jsonify({"error": "Empty question provided"}), 400
    
    try:
        # Get the full text content
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        if summary_id:
            cursor.execute("SELECT * FROM summaries WHERE id = ?", (summary_id,))
            summary = cursor.fetchone()
            
            if not summary:
                return jsonify({"error": "Summary not found"}), 404
            
            context = summary["content_preview"]
        else:
            return jsonify({"error": "Summary ID required"}), 400
        
        # Simple approach to find relevant sentences
        words = context.split()
        question_words = set(question.lower().split())
        
        # Find sentences that contain question words
        sentences = []
        current_sentence = []
        for word in words:
            current_sentence.append(word)
            if word.endswith('.') or word.endswith('?') or word.endswith('!'):
                sentences.append(' '.join(current_sentence))
                current_sentence = []
        
        # Add any remaining words as the last sentence
        if current_sentence:
            sentences.append(' '.join(current_sentence))
        
        # Score sentences by how many question words they contain
        scored_sentences = []
        for sentence in sentences:
            sentence_words = set(sentence.lower().split())
            score = len(question_words.intersection(sentence_words))
            scored_sentences.append((score, sentence))
        
        # Get top 3 most relevant sentences
        scored_sentences.sort(reverse=True)
        relevant_text = ' '.join([s[1] for s in scored_sentences[:3]])
        
        # If we have almost no relevant text, return a generic response
        if len(relevant_text.split()) < 5:
            answer_text = "I couldn't find specific information to answer your question in the provided text."
        else:
            answer_text = f"Based on the article: {relevant_text}"
        
        # Store question and answer
        question_id = str(uuid.uuid4())
        created_at = datetime.datetime.now().isoformat()
        
        cursor.execute(
            "INSERT INTO questions (id, summary_id, question, answer, created_at) VALUES (?, ?, ?, ?, ?)",
            (question_id, summary_id, question, answer_text, created_at)
        )
        
        conn.commit()
        conn.close()
        
        return jsonify({
            "id": question_id,
            "summary_id": summary_id,
            "question": question,
            "answer": answer_text,
            "created_at": created_at
        })
    except Exception as e:
        logger.error(f"Error in question answering: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/summaries", methods=["GET"])
def get_summaries():
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM summaries ORDER BY created_at DESC LIMIT 50")
        rows = cursor.fetchall()
        
        summaries = []
        for row in rows:
            summaries.append({
                "id": row["id"],
                "title": row["title"],
                "preview": row["content_preview"],
                "summary": row["summary"],
                "url": row["url"],
                "created_at": row["created_at"]
            })
        
        conn.close()
        return jsonify({"summaries": summaries})
    except Exception as e:
        logger.error(f"Error retrieving summaries: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/summaries/<summary_id>", methods=["GET"])
def get_summary(summary_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM summaries WHERE id = ?", (summary_id,))
        summary = cursor.fetchone()
        
        if not summary:
            return jsonify({"error": "Summary not found"}), 404
        
        # Get questions for this summary
        cursor.execute("SELECT * FROM questions WHERE summary_id = ? ORDER BY created_at DESC", (summary_id,))
        questions_rows = cursor.fetchall()
        
        questions = []
        for row in questions_rows:
            questions.append({
                "id": row["id"],
                "question": row["question"],
                "answer": row["answer"],
                "created_at": row["created_at"]
            })
        
        result = {
            "id": summary["id"],
            "title": summary["title"],
            "preview": summary["content_preview"],
            "summary": summary["summary"],
            "url": summary["url"],
            "created_at": summary["created_at"],
            "questions": questions
        }
        
        conn.close()
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error retrieving summary: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Get port from environment (for cloud hosting compatibility)
    port = int(os.environ.get('PORT', 5001))
    
    # In production, you'd use a proper WSGI server
    if os.environ.get('ENVIRONMENT') == 'production':
        # Production settings
        app.run(host='0.0.0.0', port=port)
    else:
        # Development settings
        app.run(port=port, debug=True)