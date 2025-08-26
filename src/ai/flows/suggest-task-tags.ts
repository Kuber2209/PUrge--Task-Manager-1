'use server';

/**
 * @fileOverview AI-powered task tag suggestion flow.
 *
 * - suggestTaskTags - A function that suggests relevant tags for a given task description.
 * - SuggestTaskTagsInput - The input type for the suggestTaskTags function.
 * - SuggestTaskTagsOutput - The return type for the suggestTaskTags function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTaskTagsInputSchema = z.object({
  taskDescription: z
    .string()
    .describe('The description of the task for which tags are to be suggested.'),
});
export type SuggestTaskTagsInput = z.infer<typeof SuggestTaskTagsInputSchema>;

const SuggestTaskTagsOutputSchema = z.object({
  tags: z
    .array(z.string())
    .describe('An array of suggested tags for the task description.'),
});
export type SuggestTaskTagsOutput = z.infer<typeof SuggestTaskTagsOutputSchema>;

export async function suggestTaskTags(input: SuggestTaskTagsInput): Promise<SuggestTaskTagsOutput> {
  return suggestTaskTagsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTaskTagsPrompt',
  input: {schema: SuggestTaskTagsInputSchema},
  output: {schema: SuggestTaskTagsOutputSchema},
  prompt: `You are an expert in task categorization. Based on the task description provided, suggest relevant tags that can be used to categorize and organize the task.

Task Description: {{{taskDescription}}}

Suggested Tags:`,
});

const suggestTaskTagsFlow = ai.defineFlow(
  {
    name: 'suggestTaskTagsFlow',
    inputSchema: SuggestTaskTagsInputSchema,
    outputSchema: SuggestTaskTagsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
