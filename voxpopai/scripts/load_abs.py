"""ETL script to download and load ABS Census data into S3 (placeholder)."""

import pathlib


def main() -> None:
    data_dir = pathlib.Path(__file__).parent.parent / "data" / "abs_raw"
    data_dir.mkdir(parents=True, exist_ok=True)
    print(f"Would download ABS data to {data_dir.resolve()}")


if __name__ == "__main__":
    main() 