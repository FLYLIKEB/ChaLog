export class PopularTagDto {
  name: string;
  count: number;
}

export class PopularTagsResponseDto {
  tags: PopularTagDto[];
}
