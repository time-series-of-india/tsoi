"""Code tables for the 2024-base CPI series (getCPIData).

Generated from /api/cpi/getCpiFilterByLevelAndBaseYear on 2026-07-26. These are
NOT the same codes as codes.py: the 2024 endpoint numbers states from 1 (All
India) rather than using 99, and the hierarchy is COICOP-2018 rather than the
old group/subgroup pair. Committed as config for the same reason as codes.py.
"""

STATES = {
    1: 'All India',
    2: 'Andaman And Nicobar Islands',
    3: 'Andhra Pradesh',
    4: 'Arunachal Pradesh',
    5: 'Assam',
    6: 'Bihar',
    7: 'Chandigarh',
    8: 'Chhattisgarh',
    9: 'Goa',
    10: 'Gujarat',
    11: 'Haryana',
    12: 'Himachal Pradesh',
    13: 'Jammu And Kashmir',
    14: 'Jharkhand',
    15: 'Karnataka',
    16: 'Kerala',
    17: 'Ladakh',
    18: 'Lakshadweep',
    19: 'Madhya Pradesh',
    20: 'Maharashtra',
    21: 'Manipur',
    22: 'Meghalaya',
    23: 'Mizoram',
    24: 'Nagaland',
    25: 'NCT of Delhi',
    26: 'Odisha',
    27: 'Puducherry',
    28: 'Punjab',
    29: 'Rajasthan',
    30: 'Sikkim',
    31: 'Tamil Nadu',
    32: 'Telangana',
    33: 'The Dadra And Nagar Haveli And Daman And Diu',
    34: 'Tripura',
    35: 'Uttar Pradesh',
    36: 'Uttarakhand',
    37: 'West Bengal',
}

SECTORS = {
    1: 'Rural',
    2: 'Urban',
    3: 'Combined',
}

MONTHS = {
    1: 'January',
    2: 'February',
    3: 'March',
    4: 'April',
    5: 'May',
    6: 'June',
    7: 'July',
    8: 'August',
    9: 'September',
    10: 'October',
    11: 'November',
    12: 'December',
}

MONTH_NUM = {v.lower(): k for k, v in MONTHS.items()}

# Hierarchy sizes as published, used as a load-time sanity check.
EXPECTED = {"division": 13, "group": 43,
            "class": 92, "sub_class": 162,
            "item": 358}
