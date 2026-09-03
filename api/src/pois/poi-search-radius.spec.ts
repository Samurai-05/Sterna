import { poiConfirmSearchRadiusMeters } from './poi-search-radius';

function descriptionWithAppeal(appeal: string): string {
  return `Some place. ${appeal} More details.`;
}

describe('poiConfirmSearchRadiusMeters', () => {
  it('gives a natural feature (e.g. a mountain) the widest radius', () => {
    const description = descriptionWithAppeal(
      'Its scenery and ecosystems showcase a distinctive part of the country’s natural heritage.',
    );

    expect(poiConfirmSearchRadiusMeters(description)).toBe(20_000);
  });

  it('gives a tall, deliberately visible structure a mid-sized radius', () => {
    const description = descriptionWithAppeal(
      'Its distinctive silhouette and views have made it an enduring landmark of the surrounding area.',
    );

    expect(poiConfirmSearchRadiusMeters(description)).toBe(5_000);
  });

  it('gives a museum, monument or cathedral a tight radius', () => {
    const museum = descriptionWithAppeal(
      'Its collections bring together objects and stories that make the country’s history and creativity easier to understand.',
    );
    const sacred = descriptionWithAppeal(
      'Its architecture and living traditions reveal an important part of the spiritual and cultural life of the region.',
    );

    expect(poiConfirmSearchRadiusMeters(museum)).toBe(1_000);
    expect(poiConfirmSearchRadiusMeters(sacred)).toBe(1_000);
  });

  it('falls back to the widest radius for an unrecognized or missing description', () => {
    expect(
      poiConfirmSearchRadiusMeters('Some place with no known appeal.'),
    ).toBe(20_000);
    expect(poiConfirmSearchRadiusMeters(null)).toBe(20_000);
  });
});
