import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

export async function generateAiCompletionRoute(app: FastifyInstance) {
  app.post('/ai/complete', async (req, reply) => {
    const bodySchema = z.object({
      videoId: z.string().uuid(),
      prompt: z.string(),
      temperature: z.number().min(0).max(1).default(0.5),
    })

    const { videoId, prompt, temperature } = bodySchema.parse(req.body)

    const video = await prisma.video.findFirstOrThrow({
      where: {
        id: videoId,
      },
    })

    if (!video.transcription)
      return reply
        .status(400)
        .send({ error: 'Video transcription was not generated yet.' })

    const promptMessage = prompt.replace('{transcription}', video.transcription)

    const result = streamText({
      model: openai('gpt-3.5-turbo'),
      temperature,
      messages: [{ role: 'user', content: promptMessage }],
    })

    reply.raw.setHeader('Access-Control-Allow-Origin', '*')
    reply.raw.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    )

    return result.pipeTextStreamToResponse(reply.raw)
  })
}
