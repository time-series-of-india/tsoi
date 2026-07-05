import os
import argparse
from settlement_data_parser import parse_data, process_data, write_to_file
from loader import load_data

def main():
    parser = argparse.ArgumentParser(description="Parse data from Excel and load into PostgreSQL database.")
    parser.add_argument("--parse", action="store_true", help="Run parse step")
    parser.add_argument("--load", action="store_true", help="Run load step")
    parser.add_argument("--file", metavar="PATH", help="Path to the input Excel file (required when --parse is used)")
    parser.add_argument("--json-file", metavar="PATH", dest="json_file", help="Path to intermediate JSON file (default: derived from --file basename, or required if --load without --parse)")
    parser.add_argument("--product_dict", default="product-dict.json", help="Path to the product dictionary JSON file")

    args = parser.parse_args()

    # Derive intermediate JSON filename if not provided
    if args.json_file is None:
        if args.file is not None:
            base = os.path.splitext(os.path.basename(args.file))[0]
            args.json_file = f"{base}.json"
        elif args.load and not args.parse:
            parser.error("--json-file is required when --load is used without --parse")

    # Validate --parse requires --file
    if args.parse and not args.file:
        parser.error("--file is required when --parse is used")

    # Validate at least one action is specified
    if not args.parse and not args.load:
        parser.error("At least one of --parse or --load must be specified")

    if args.parse:
        print("Parsing data...")
        data_list = parse_data(args.file, args.product_dict)

        print("Processing data...")
        data_list = process_data(data_list)

        print(f"Writing {len(data_list)} records to {args.json_file}")
        write_to_file(data_list, args.json_file)

    if args.load:
        if not os.path.exists(args.json_file):
            parser.error(f"JSON file not found: {args.json_file}. Run with --parse first to generate it.")
        print("Loading data into database...")
        load_data(args.json_file)

if __name__ == "__main__":
    main()
