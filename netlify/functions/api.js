const GAS_URL = 'https://script.google.com/macros/s/AKfycbw-XBD_UBLKmnxzL1KZgzCqXSHqeZd9FtJGYWz6Len7PiHP2xhLCexVnGore4bVW_cT/exec';

exports.handler = async (event) => {
  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: event.body,
      redirect: 'follow'
    });

    const text = await response.text();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: text
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.toString() })
    };
  }
};
