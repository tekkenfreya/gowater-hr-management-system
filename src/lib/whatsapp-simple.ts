// Simple WhatsApp Web integration using group ID
export class SimpleWhatsAppService {
  private groupId = 'CjYWbEz8tG2AC6S0KeSjxM'; // Your WhatsApp group ID

  // Send message directly to WhatsApp group with 1-click
  sendToGroup(message: string) {
    const encodedMessage = encodeURIComponent(message);
    
    // For groups, we use WhatsApp Web without phone number
    // This will open WhatsApp Web with the message ready to forward/send
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    // Open WhatsApp with the message pre-filled
    // User will need to select the group manually, but message is ready
    window.open(whatsappUrl, '_blank');
  }

  // Copy message to clipboard as fallback
  async copyToClipboard(message: string) {
    try {
      await navigator.clipboard.writeText(message);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  // Send with options: try WhatsApp first, fallback to clipboard
  async sendReport(message: string, reportType: 'start' | 'eod') {
    try {
      // First try to send to WhatsApp
      this.sendToGroup(message);
      
      // Also copy to clipboard as backup
      await this.copyToClipboard(message);
      
      // No alert - silent operation
      
    } catch (error) {
      // Fallback: just copy to clipboard
      const success = await this.copyToClipboard(message);
      if (!success) {
        // Last resort: show in prompt only if clipboard fails
        prompt('Copy this report to WhatsApp:', message);
      }
    }
  }
}

export const simpleWhatsAppService = new SimpleWhatsAppService();
export default simpleWhatsAppService;