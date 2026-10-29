/** EMV tag dictionary (EMV Books 1-4 and common scheme tags). fmt: n = BCD digits, an/ans = text, b = binary, cn = compressed numeric. */
export const TAGS: Record<string, [string, "n" | "an" | "ans" | "b" | "cn"]> = {
  "42": ["Issuer Identification Number (IIN)", "n"], "4F": ["Application Identifier (AID) - card", "b"], "50": ["Application Label", "ans"],
  "56": ["Track 1 Data", "ans"], "57": ["Track 2 Equivalent Data", "b"], "5A": ["Application Primary Account Number (PAN)", "cn"],
  "5F20": ["Cardholder Name", "ans"], "5F24": ["Application Expiration Date (YYMMDD)", "n"], "5F25": ["Application Effective Date (YYMMDD)", "n"],
  "5F28": ["Issuer Country Code", "n"], "5F2A": ["Transaction Currency Code", "n"], "5F2D": ["Language Preference", "an"], "5F30": ["Service Code", "n"],
  "5F34": ["Application PAN Sequence Number", "n"], "5F36": ["Transaction Currency Exponent", "n"], "5F50": ["Issuer URL", "ans"], "5F53": ["IBAN", "b"],
  "61": ["Application Template", "b"], "6F": ["File Control Information (FCI) Template", "b"], "70": ["READ RECORD Response Message Template", "b"],
  "71": ["Issuer Script Template 1", "b"], "72": ["Issuer Script Template 2", "b"], "73": ["Directory Discretionary Template", "b"],
  "77": ["Response Message Template Format 2", "b"], "80": ["Response Message Template Format 1", "b"], "81": ["Amount, Authorised (Binary)", "b"],
  "82": ["Application Interchange Profile (AIP)", "b"], "83": ["Command Template", "b"], "84": ["Dedicated File (DF) Name", "b"], "86": ["Issuer Script Command", "b"],
  "87": ["Application Priority Indicator", "b"], "88": ["Short File Identifier (SFI)", "b"], "89": ["Authorisation Code", "ans"], "8A": ["Authorisation Response Code", "an"],
  "8C": ["Card Risk Management Data Object List 1 (CDOL1)", "b"], "8D": ["Card Risk Management Data Object List 2 (CDOL2)", "b"], "8E": ["Cardholder Verification Method (CVM) List", "b"],
  "8F": ["Certification Authority Public Key Index", "b"], "90": ["Issuer Public Key Certificate", "b"], "91": ["Issuer Authentication Data", "b"],
  "92": ["Issuer Public Key Remainder", "b"], "93": ["Signed Static Application Data", "b"], "94": ["Application File Locator (AFL)", "b"],
  "95": ["Terminal Verification Results (TVR)", "b"], "97": ["Transaction Certificate Data Object List (TDOL)", "b"], "98": ["Transaction Certificate (TC) Hash Value", "b"],
  "99": ["Transaction PIN Data", "b"], "9A": ["Transaction Date (YYMMDD)", "n"], "9B": ["Transaction Status Information (TSI)", "b"], "9C": ["Transaction Type", "n"],
  "9D": ["Directory Definition File (DDF) Name", "b"], "9F01": ["Acquirer Identifier", "n"], "9F02": ["Amount, Authorised (Numeric)", "n"], "9F03": ["Amount, Other (Numeric)", "n"],
  "9F05": ["Application Discretionary Data", "b"], "9F06": ["Application Identifier (AID) - terminal", "b"], "9F07": ["Application Usage Control", "b"],
  "9F08": ["Application Version Number (card)", "b"], "9F09": ["Application Version Number (terminal)", "b"], "9F0B": ["Cardholder Name Extended", "ans"],
  "9F0D": ["Issuer Action Code - Default", "b"], "9F0E": ["Issuer Action Code - Denial", "b"], "9F0F": ["Issuer Action Code - Online", "b"],
  "9F10": ["Issuer Application Data (IAD)", "b"], "9F11": ["Issuer Code Table Index", "n"], "9F12": ["Application Preferred Name", "ans"], "9F13": ["Last Online ATC Register", "b"],
  "9F14": ["Lower Consecutive Offline Limit", "b"], "9F15": ["Merchant Category Code", "n"], "9F16": ["Merchant Identifier", "ans"], "9F17": ["PIN Try Counter", "b"],
  "9F1A": ["Terminal Country Code", "n"], "9F1B": ["Terminal Floor Limit", "b"], "9F1C": ["Terminal Identification", "an"], "9F1D": ["Terminal Risk Management Data", "b"],
  "9F1E": ["Interface Device (IFD) Serial Number", "an"], "9F1F": ["Track 1 Discretionary Data", "ans"], "9F20": ["Track 2 Discretionary Data", "cn"],
  "9F21": ["Transaction Time (HHMMSS)", "n"], "9F23": ["Upper Consecutive Offline Limit", "b"], "9F26": ["Application Cryptogram (AC)", "b"],
  "9F27": ["Cryptogram Information Data (CID)", "b"], "9F2D": ["ICC PIN Encipherment Public Key Certificate", "b"], "9F32": ["Issuer Public Key Exponent", "b"],
  "9F33": ["Terminal Capabilities", "b"], "9F34": ["Cardholder Verification Method (CVM) Results", "b"], "9F35": ["Terminal Type", "n"],
  "9F36": ["Application Transaction Counter (ATC)", "b"], "9F37": ["Unpredictable Number", "b"], "9F38": ["Processing Options Data Object List (PDOL)", "b"],
  "9F39": ["Point-of-Service (POS) Entry Mode", "n"], "9F3A": ["Amount, Reference Currency", "b"], "9F3B": ["Application Reference Currency", "n"],
  "9F3C": ["Transaction Reference Currency Code", "n"], "9F3D": ["Transaction Reference Currency Exponent", "n"], "9F40": ["Additional Terminal Capabilities", "b"],
  "9F41": ["Transaction Sequence Counter", "n"], "9F42": ["Application Currency Code", "n"], "9F43": ["Application Reference Currency Exponent", "n"],
  "9F44": ["Application Currency Exponent", "n"], "9F45": ["Data Authentication Code", "b"], "9F46": ["ICC Public Key Certificate", "b"], "9F47": ["ICC Public Key Exponent", "b"],
  "9F48": ["ICC Public Key Remainder", "b"], "9F49": ["Dynamic Data Authentication Data Object List (DDOL)", "b"], "9F4A": ["Static Data Authentication Tag List", "b"],
  "9F4B": ["Signed Dynamic Application Data", "b"], "9F4C": ["ICC Dynamic Number", "b"], "9F4D": ["Log Entry", "b"], "9F4E": ["Merchant Name and Location", "ans"],
  "9F4F": ["Log Format", "b"], "9F53": ["Transaction Category Code", "an"], "9F5A": ["Application Program Identifier", "b"], "9F5B": ["Issuer Script Results", "b"],
  "9F66": ["Terminal Transaction Qualifiers (TTQ)", "b"], "9F67": ["MSD Offset", "b"], "9F69": ["Card Authentication Related Data", "b"], "9F6B": ["Track 2 Data (contactless)", "b"],
  "9F6C": ["Card Transaction Qualifiers (CTQ)", "b"], "9F6E": ["Form Factor Indicator / Third Party Data", "b"], "9F7C": ["Customer Exclusive Data", "b"],
  "A5": ["FCI Proprietary Template", "b"], "BF0C": ["FCI Issuer Discretionary Data", "b"], "DF8129": ["Outcome Parameter Set (Kernel)", "b"],
};

export const TVR_BITS: string[][] = [
  ["Offline data authentication was not performed", "SDA failed", "ICC data missing", "Card appears on terminal exception file", "DDA failed", "CDA failed", "SDA selected", "RFU"],
  ["ICC and terminal have different application versions", "Expired application", "Application not yet effective", "Requested service not allowed for card product", "New card", "RFU", "RFU", "RFU"],
  ["Cardholder verification was not successful", "Unrecognised CVM", "PIN Try Limit exceeded", "PIN entry required and PIN pad not present or not working", "PIN entry required, PIN pad present, but PIN was not entered", "Online PIN entered", "RFU", "RFU"],
  ["Transaction exceeds floor limit", "Lower consecutive offline limit exceeded", "Upper consecutive offline limit exceeded", "Transaction selected randomly for online processing", "Merchant forced transaction online", "RFU", "RFU", "RFU"],
  ["Default TDOL used", "Issuer authentication failed", "Script processing failed before final GENERATE AC", "Script processing failed after final GENERATE AC", "RFU", "RFU", "RFU", "RFU"],
];
export const TSI_BITS: string[][] = [["Offline data authentication was performed", "Cardholder verification was performed", "Card risk management was performed", "Issuer authentication was performed", "Terminal risk management was performed", "Script processing was performed", "RFU", "RFU"]];
export const AIP_BITS: string[][] = [["RFU", "SDA supported", "DDA supported", "Cardholder verification is supported", "Terminal risk management is to be performed", "Issuer authentication is supported", "On-device cardholder verification supported", "CDA supported"]];
export const CVM_METHOD: Record<number, string> = { 0x00: "Fail CVM processing", 0x01: "Plaintext PIN verified by ICC", 0x02: "Enciphered PIN verified online", 0x03: "Plaintext PIN by ICC and signature", 0x04: "Enciphered PIN verified by ICC", 0x05: "Enciphered PIN by ICC and signature", 0x1e: "Signature (paper)", 0x1f: "No CVM required", 0x3f: "No CVM performed" };
export const CURRENCY: Record<string, string> = { "0356": "INR", "0840": "USD", "0978": "EUR", "0826": "GBP", "0392": "JPY", "0784": "AED", "0702": "SGD", "0036": "AUD", "0124": "CAD", "0156": "CNY" };
export const COUNTRY: Record<string, string> = { "0356": "India", "0840": "United States", "0826": "United Kingdom", "0276": "Germany", "0250": "France", "0392": "Japan", "0784": "UAE", "0702": "Singapore", "0036": "Australia", "0124": "Canada" };
