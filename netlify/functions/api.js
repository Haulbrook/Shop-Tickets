const GAS_URL = 'https://script.google.com/macros/s/AKfycbw5JSET7_sV7cXrA9JaupuAzAg9VGvlndlI1u7a6NztNMYAx0fK3T7-UWQv2juxxxsMcA/exec';

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
