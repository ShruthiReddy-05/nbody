from app import app  # noqa: F401

# The Flask application is imported from app.py
# This file is used by gunicorn to start the application
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)