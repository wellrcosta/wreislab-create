import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('example')
@Controller()
export class ExampleController {
  @Get('hello')
  @ApiOperation({ summary: 'Hello world endpoint' })
  @ApiResponse({ status: 200 })
  hello(): { message: string } {
    return { message: 'Hello from {{PROJECT_NAME}}!' };
  }
}
