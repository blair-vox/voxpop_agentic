from setuptools import setup, find_packages

setup(
    name="voxpopai",
    version="0.1",
    packages=find_packages(),
    install_requires=[
        "fastapi",
        "uvicorn",
        "pydantic",
        "python-dotenv",
        "openai",
        "pandas",
        "numpy",
    ],
) 