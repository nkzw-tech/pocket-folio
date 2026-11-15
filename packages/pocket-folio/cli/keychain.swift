import Foundation
import Security
// The secret is transferred only over stdin/stdout pipes, never process arguments.
let args = CommandLine.arguments
 guard args.count == 4 else { exit(2) }
let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
  kSecAttrService as String: args[2], kSecAttrAccount as String: args[3]]
switch args[1] {
case "set":
  let data = FileHandle.standardInput.readDataToEndOfFile()
  guard !data.isEmpty, data.count <= 512 else { exit(2) }
  let status = SecItemUpdate(query as CFDictionary, [kSecValueData as String:data] as CFDictionary)
  if status == errSecItemNotFound {
    var item = query
    item[kSecValueData as String] = data
    item[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
    guard SecItemAdd(item as CFDictionary, nil) == errSecSuccess else { exit(1) }
  } else if status != errSecSuccess { exit(1) }
case "get":
  var lookup = query
  lookup[kSecReturnData as String] = true
  lookup[kSecMatchLimit as String] = kSecMatchLimitOne
  var result: CFTypeRef?
  guard SecItemCopyMatching(lookup as CFDictionary, &result) == errSecSuccess, let data = result as? Data else { exit(1) }
  FileHandle.standardOutput.write(data)
case "delete":
  let status = SecItemDelete(query as CFDictionary)
  if status != errSecSuccess && status != errSecItemNotFound { exit(1) }
default: exit(2)
}
