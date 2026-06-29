export async function onRequest(context) {
  const { env } = context

  const aiKey = Object.keys(env).find((k) => k.trim() === 'AI' || k.startsWith('AI'))
  const ai = aiKey ? env[aiKey] : null

  return new Response(
    JSON.stringify(
      {
        bindingFound: !!ai,
        bindingName: aiKey,
        envKeys: Object.keys(env).filter((k) => k.startsWith('AI') || k.includes('AI')),
        message: ai ? 'AI binding OK - ready to translate' : 'No AI binding found',
      },
      null,
      2,
    ),
    {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
    },
  )
}
