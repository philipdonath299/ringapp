// Colmi Ring R10 BLE Protocol Helper

// Service & Characteristic UUIDs
export const UART_SERVICE_UUID = "6e40fff0-b5a3-f393-e0a9-e50e24dcca9e";
export const UART_RX_CHAR_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // Write
export const UART_TX_CHAR_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // Notify

export const DATA_SERVICE_UUID = "de5bf728-d711-4e47-af26-65e3012a5dc7";
export const DATA_TX_CHAR_UUID = "de5bf72a-d711-4e47-af26-65e3012a5dc7"; // Write
export const DATA_RX_CHAR_UUID = "de5bf729-d711-4e47-af26-65e3012a5dc7"; // Notify

// Command Constants
export const CMD_SET_TIME = 0x01;
export const CMD_BATTERY = 0x03;
export const CMD_REBOOT = 0x08;
export const CMD_BLINK_TWICE = 0x10;
export const CMD_READ_HEART_RATE = 0x15;
export const CMD_GET_STEP_SOMEDAY = 0x43;
export const CMD_START_REAL_TIME = 105; // 0x69
export const CMD_STOP_REAL_TIME = 106;  // 0x6A

export const DATA_REQ_SLEEP = 0x27;
export const DATA_REQ_OXYGEN = 0x2A;
export const DATA_REQ_MAGIC = 0xBC;

export const LANGUAGE_ENGLISH = 0x01;
export const LANGUAGE_CHINESE = 0x00;

// Helper to calculate checksum
export function calculateChecksum(packet) {
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    sum += packet[i];
  }
  return sum & 255;
}

// Helper to make a standard 16-byte UART command packet
export function makePacket(command, subData = null) {
  const packet = new Uint8Array(16);
  packet[0] = command;
  if (subData) {
    for (let i = 0; i < Math.min(subData.length, 14); i++) {
      packet[i + 1] = subData[i];
    }
  }
  packet[15] = calculateChecksum(packet);
  return packet;
}

// Helper to make a 6-byte data request packet
export function makeDataPacket(command) {
  const packet = new Uint8Array(6);
  packet[0] = DATA_REQ_MAGIC;
  packet[1] = command;
  packet[2] = 0x00;
  packet[3] = 0x00;
  packet[4] = 0xFF;
  packet[5] = 0xFF;
  return packet;
}

// Helper converters
export function byteToBcd(b) {
  return (Math.floor(b / 10) << 4) | (b % 10);
}

export function bcdToDecimal(b) {
  return (((b >> 4) & 15) * 10) + (b & 15);
}

export function parseBattery(packet) {
  if (packet[0] !== CMD_BATTERY) return null;
  return {
    batteryLevel: packet[1],
    charging: packet[2] === 1
  };
}
